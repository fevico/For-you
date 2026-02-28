import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schema/user.schema';
import { Model } from 'mongoose';
import {
  CreateUserDto,
  ForgetPasswordDto,
  LoginUserDto,
  ResendVerificationDto,
  ResetPassword,
  VerifyEmailDto,
  VerifyPasswordToken,
} from './dto/user';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';
import {
  VerificationToken,
  VerificationTokenDocument,
} from './schema/verificationToken.schema';

export interface JwtPayload {
  sub: string; // User ID
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(VerificationToken.name)
    private verificationTokenModel: Model<VerificationTokenDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { username, email, password } = createUserDto;
    const user = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });
    if (user) {
      throw new UnauthorizedException(
        'User with given email or username already exists',
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
    });
    await createdUser.save();
    // Send verification email logic to be implemented
    const verificationCode = this.emailService.generateVerificationCode();
    // await this
    await this.verificationTokenModel.deleteMany({ userId: createdUser._id }); // Remove old tokens if any
    const hashedToken = await bcrypt.hash(verificationCode, 10);
    const verificationToken = new this.verificationTokenModel({
      user: createdUser._id,
      token: hashedToken,
    });
    await verificationToken.save();
    await this.emailService.sendVerificationEmail(
      email,
      username,
      verificationCode,
    );
    // Return user data without password
    const { password: _, ...userData } = createdUser.toObject();
    return { message: 'User created successfully', user: userData };
  }

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
    return this.jwtService.sign(payload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET,
    });
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token, userId } = verifyEmailDto;
    try {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new UnauthorizedException('Invalid user');
      }

      const tokenExist = await this.verificationTokenModel.findOne({
        user: userId,
      });
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

  async resendVerificatonToken(body: ResendVerificationDto){
    try {
      const {email} = body
      const user = await this.userModel.findOne({email})
      if(!user) throw new UnauthorizedException("invalid credentials!")
      const verificationCode = this.emailService.generateVerificationCode();
    await this.verificationTokenModel.deleteMany({ userId: user._id }); // Remove old tokens if any
    const hashedToken = await bcrypt.hash(verificationCode, 10);
    const verificationToken = new this.verificationTokenModel({
      user: user._id,
      token: hashedToken,
    });
    await verificationToken.save();
    await this.emailService.sendVerificationEmail(
      email,
      user.username,
      verificationCode,
    );
    return {message: "Check your email for verification token", userId: user._id}
    } catch (error) {
      throw new HttpException(`Unable to send token to user`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async forgetPassword(body: ForgetPasswordDto) {
    const { email } = body;
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) throw new UnauthorizedException('Invalid credentials');
      const token = this.emailService.generateVerificationCode();
      const hashToken = await bcrypt.hash(token, 10);
      const passwordToken = await this.verificationTokenModel.create({
        userId: user._id,
        token: hashToken,
        type: 'Password',
      });
      // send email
      await this.emailService.sendPasswordResetEmail(
        email,
        user.username,
        token,
      );
      return {
        message: 'Check your email to reset your password',
        userId: user._id,
      };
    } catch (error) {
      throw new HttpException(
        `${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyPasswordToken(body: VerifyPasswordToken) {
    try {
      const { token, userId } = body;
      const user = await this.verificationTokenModel.findOne({
        userId,
        type: 'Password',
      });
      if (!user) throw new UnauthorizedException('Invalid token!');
      const tokenMatch = await bcrypt.compare(token, user.token);
      if (tokenMatch) throw new UnauthorizedException('Invalid token!');
      await this.verificationTokenModel.deleteOne({
        user: userId, 
        type: 'Password', 
      });
      return { message: 'Token verified successfully', userId: user._id};
    } catch (error) {
      throw new HttpException(`${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async resetForgetPassword(body: ResetPassword) {
    try {
      const {userId, password} = body
      const user = await this.userModel.findById(userId)
      if(!user) throw new UnauthorizedException("Acccess denied cannot change password for the user!")
        const passwordMatch = await bcrypt.compare(password, user.password)
      if(passwordMatch) throw new BadRequestException("New password cannot be the same as old password!")
        const hashPassword = await bcrypt.hash(password, 10)
      await this.userModel.findByIdAndUpdate( userId, { password: hashPassword }, {new: true})
      return {message: "Password reset successfully"}
    } catch (error) {
      throw new HttpException(`"Failed to reset password. Please try again later.",`, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
