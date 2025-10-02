import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, LoginUserDto } from './dto/user';
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;  // User ID
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, age } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({ name, email, password: hashedPassword, age });
    await createdUser.save();

    // Return user data without password
    const { password: _, ...userData } = createdUser.toObject();
    return { message: "User created successfully", user: userData };
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    
    // Use validateUser for proper hashing check
    const userData = await this.validateUser(email, password);
    
    // Generate JWT token
    const token = this.signToken(userData._id);  // sub is user ID
    
    return {
      message: 'Login successful',
      user: userData,
      token,
    };
  }

  async validateUser(email: string, password: string) {
    // Find user by email
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return user data (excluding password)
    const { password: _, ...userData } = user.toObject();
    return userData;
  }

  private signToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.sign(payload);
  }
}