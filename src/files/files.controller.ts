import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { FilesService } from './files.service';
import { FileSizeValidationPipe } from './validation/fileSize.validator';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadFile(
    @UploadedFile(new FileSizeValidationPipe()) file: Express.Multer.File,
  ) {
    return this.filesService.saveFile(file);
  }
}
