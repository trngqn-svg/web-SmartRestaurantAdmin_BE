import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ItemReviewsService } from './item-review.service';
import { ListItemReviewsQuery } from './dto/item-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('/api/admin')
export class ItemReviewsController {
  constructor(private readonly service: ItemReviewsService) {}

  @Get('/menu/:id/reviews')
  async listByItem(@Param('id') itemId: string, @Query() q: ListItemReviewsQuery) {
    return this.service.adminListByItem(itemId, q);
  }

  @Delete('/item-reviews/:reviewId')
  async remove(@Param('reviewId') reviewId: string) {
    return this.service.adminRemove(reviewId);
  }
}
