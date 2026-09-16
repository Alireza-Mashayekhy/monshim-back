import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IMAGE_MAX_SIZE_BYTES } from 'src/common/constants/constants';
import { AuthGuard } from 'src/common/guards/auth.guard';

import { FilesService } from './files.service';
import { FileSizeValidationPipe } from './validation/fileSize.validator';

@Controller('files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE_BYTES },
    }),
  )
  uploadFile(
    @UploadedFile(new FileSizeValidationPipe()) file: Express.Multer.File,
  ) {
    return this.filesService.saveFile(file);
  }
}
