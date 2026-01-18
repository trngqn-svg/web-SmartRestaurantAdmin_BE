import { Controller, Get } from "@nestjs/common";
import { AdminDashboardService } from "./admin-dashboard.service";
import { RESTAURANT_ID } from "../config/restaurant.config";

@Controller("/admin/dashboard")
export class AdminDashboardController {
  constructor(private readonly svc: AdminDashboardService) {}

  @Get("/overview")
  async overview() {
    return this.svc.overview({ restaurantId: RESTAURANT_ID });
  }
}
