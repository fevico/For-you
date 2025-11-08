import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, LoginUserDto, VerifyEmailDto } from './dto/user';
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';
import { VerificationToken, VerificationTokenDocument } from './schema/verificationToken.schema';

export interface JwtPayload {
  sub: string;  // User ID
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) 
    private userModel: Model<UserDocument>,
    @InjectModel(VerificationToken.name)
    private verificationTokenModel: Model<VerificationTokenDocument>,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {} 

  async create(createUserDto: CreateUserDto) {
    const { username, email, password } = createUserDto;
    const user = await this.userModel.findOne({ $or: [ { email }, { username } ] });
    if (user) {
      throw new UnauthorizedException('User with given email or username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({ username, email, password: hashedPassword });
    await createdUser.save();
    // Send verification email logic to be implemented 
  const verificationCode = this.emailService.generateVerificationCode();  
  // await this
  await this.verificationTokenModel.deleteMany({ userId: createdUser._id }); // Remove old tokens if any
  const hashedToken = await bcrypt.hash(verificationCode, 10);
  const verificationToken = new this.verificationTokenModel({ user: createdUser._id, token: hashedToken });
  await verificationToken.save();
    await this.emailService.sendVerificationEmail(email, username, verificationCode);
    // Return user data without password
    const { password: _, ...userData } = createdUser.toObject();  
    return { message: "User created successfully", user: userData };
  }

  // async login(loginUserDto: LoginUserDto) {
  //   const { email, password } = loginUserDto;
    
  //   // Use validateUser for proper hashing check
  //   const userData = await this.validateUser(email, password);
    
  //   // Generate JWT token
  //   const token = this.signToken(userData._id);  // sub is user ID
    
  //   return {
  //     message: 'Login successful', 
  //     user: userData,
  //     token,
  //   };
  // }

  // async validateUser(email: string, password: string) {
  //   // Find user by email
  //   const user = await this.userModel.findOne({ email });

  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   // Compare password with hashed password
  //   const passwordMatch = await bcrypt.compare(password, user.password);
    
  //   if (!passwordMatch) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   // Return user data (excluding password)
  //   const { password: _, ...userData } = user.toObject();
  //   return userData;
  // }

async validateUser(email: string, password: string) {
  const user = await this.userModel.findOne({ email });
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Return clean object with _id
  return {
    _id: user._id.toString(),
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

async login(loginUserDto: LoginUserDto) {
  const { email, password } = loginUserDto;
  const userData = await this.validateUser(email, password);

  const token = this.signToken(userData._id);

  return {
    message: 'Login successful',
    user: userData,
    token,
  };
}

  private signToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.sign(payload, {expiresIn: '1h', secret: process.env.JWT_SECRET});
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token, userId } = verifyEmailDto;
    try {
          const user = await this.userModel.findById(userId);
              
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const tokenExist = await this.verificationTokenModel.findOne({ user: userId });
    if (!tokenExist) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const isValidToken = await bcrypt.compare(token, tokenExist.token);
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    user.emailVerified = true; 
    await user.save();
    await this.verificationTokenModel.deleteOne({ user: userId });

    return { message: 'Email verified successfully' };
    } catch (error) {
      throw new UnauthorizedException('Email verification failed');
    }
  }
}