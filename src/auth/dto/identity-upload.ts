import { ApiProperty } from '@nestjs/swagger';

export class IdentityUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',           // Tells Swagger this is a file input (shows "Choose File" button)
    description: 'Identity document file (JPG, PNG, or PDF)',
  })
  identity: Express.Multer.File;
}