import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Module({
  imports: [],
  providers: [UploadsService],
  exports: [UploadsService]
})
export class UploadsModule {}
