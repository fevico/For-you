import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from 'src/email/email.module';
import { VerificationToken, VerificationTokenSchema } from './schema/verificationToken.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // Use env var in production
      signOptions: { expiresIn: '24h' },
    }),
    EmailModule,
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
