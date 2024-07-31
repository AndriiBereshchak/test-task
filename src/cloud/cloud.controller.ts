import { Controller, Get } from '@nestjs/common';
import { CloudService } from './cloud.service';

@Controller('cloud')
export class CloudController {
  constructor(private readonly cloudService: CloudService) {}

  @Get()
  async generateWordCloud() {
    await this.cloudService.generateWordCloud();
    return 'Word cloud has been generated.';
  }
}
