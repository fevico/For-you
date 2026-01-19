import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'john_doe',
    description: 'Username must be at least 2 characters long',
  })
  @IsNotEmpty()
  @MinLength(2)
  username: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Valid email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password must be at least 6 characters long',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Valid email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password must be at least 6 characters long',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: '1234',
    description: 'Email verification token sent to user',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'MongoDB user ID',
  })
  @IsString()
  userId: string;
}
