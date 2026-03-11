import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CreateUserDto,
  ForgetPasswordDto,
  LoginUserDto,
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/user';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdentityUploadDto } from './dto/identity-upload';
import { AuthGuard } from 'src/guard/auth.guard';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiBadRequestResponse({
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User already exists',
    schema: {
      example: {
        statusCode: 401,
        message: 'User with given email or username already exists',
        error: 'Unauthorized',
      },
    },
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user and generate JWT token' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        message: 'Login successful',
        user: {
          id: '507f1f77bcf86cd799439011',
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
  })
@ApiResponse({
  status: 401,
  description: 'Invalid credentials',
  schema: {
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized'
    }
  }
})
async login(@Body() loginUserDto: LoginUserDto) {
    try {
      return await this.authService.login(loginUserDto);
    } catch (error) {
      console.log(error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post('upload-identity') // better name than upload-id
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('identity', {
      limits: { fileSize: 6 * 1024 * 1024 }, // 6MB max
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
          return cb(
            new BadRequestException('Only jpg, png, pdf allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth() // shows lock icon in swagger if JWT
  @ApiOperation({ summary: 'Upload user identity document (KYC)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload identity document (passport, driver license, etc.)',
    type: IdentityUploadDto,
  })
  @ApiOkResponse({
    description: 'Identity uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Identity document uploaded and saved successfully',
        },
        identity: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://res.cloudinary.com/...' },
            public_id: {
              type: 'string',
              example: 'identities/1234567890-file.pdf',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
  description: 'Invalid file or upload failed',
  schema: {
    example: {
      statusCode: 400,
      message: 'No valid file provided',
      error: 'Bad Request'
    }
  }
})

@ApiResponse({
  status: 404,
  description: 'User not found',
  schema: {
    example: {
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found'
    }
  }
})
async uploadUserIdentity(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('Authentication required');
    }

    return this.authService.uploadIdentity(userId, file);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  @ApiBody({ type: VerifyEmailDto })
@ApiOkResponse({
  description: 'Email verified successfully',
  schema: {
    example: {
      message: 'Email verified successfully',
      jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
})

@ApiResponse({
  status: 401,
  description: 'Invalid or expired token',
  schema: {
    example: {
      statusCode: 401,
      message: 'Invalid or expired token',
      error: 'Unauthorized'
    }
  }
})
async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification token' })
  @ApiBody({ type: ResendVerificationDto })
@ApiOkResponse({
  description: 'Verification token resent',
  schema: {
    example: {
      message: 'Check your email for verification token',
      userId: '665c8c3e2f3c9f0012b1f991'
    }
  }
})

@ApiResponse({
  status: 401,
  description: 'Invalid credentials',
  schema: {
    example: {
      statusCode: 401,
      message: 'invalid credentials!',
      error: 'Unauthorized'
    }
  }
})

@ApiResponse({
  status: 500,
  description: 'Server error',
  schema: {
    example: {
      statusCode: 500,
      message: 'Unable to send token to user'
    }
  }
})
async resendVerification(@Body() verifyEmailDto: ResendVerificationDto) {
    return this.authService.resendVerificatonToken(verifyEmailDto);
  }

  @Post('forget-password')
  @ApiOperation({ summary: 'Forget password' })
  @ApiBody({ type: ForgetPasswordDto })
@ApiOkResponse({
  description: 'Password reset email sent',
  schema: {
    example: {
      message: 'Check your email to reset your password',
      userId: '665c8c3e2f3c9f0012b1f991'
    }
  }
})

@ApiResponse({
  status: 401,
  description: 'Invalid credentials',
  schema: {
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized'
    }
  }
})

@ApiResponse({
  status: 500,
  description: 'Internal server error',
  schema: {
    example: {
      statusCode: 500,
      message: 'Something went wrong'
    }
  }
})
async forgetPassword(@Body() forgetPasswordDto: ForgetPasswordDto) {
    return this.authService.forgetPassword(forgetPasswordDto);
  }
}
