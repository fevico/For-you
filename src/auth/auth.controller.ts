import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateUserDto, ForgetPasswordDto, LoginUserDto, ResendVerificationDto, VerifyEmailDto } from './dto/user';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}  

  @Post('create')
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (validation error)' })
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
        user: { id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', age: 30 },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginUserDto: LoginUserDto) {
    try {
      return await this.authService.login(loginUserDto);
    } catch (error) {
      console.log(error)
      if (error instanceof UnauthorizedException) { 
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post("verify-email")
  @ApiOperation({ summary: 'Verify user email' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verification successful' })
  @ApiResponse({ status: 400, description: 'Bad request (validation error)' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: 'Resend email verification token' })
  @ApiBody({ type: ResendVerificationDto }) 
  @ApiResponse({ status: 200, description: 'Verification email resent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (validation error)' })
  async resendVerification(@Body() verifyEmailDto: ResendVerificationDto) {
    return this.authService.resendVerificatonToken(verifyEmailDto);
  }

  @Post("forget-password")
  @ApiOperation({ summary: 'Forget password' })
  @ApiBody({ type: ForgetPasswordDto }) 
  @ApiResponse({ status: 200, description: 'Password token sent to user email' })
  @ApiResponse({ status: 400, description: 'Bad request (validation error)' })
  async forgetPassword(@Body() forgetPasswordDto: ForgetPasswordDto) {
    return this.authService.forgetPassword(forgetPasswordDto);
  }
}