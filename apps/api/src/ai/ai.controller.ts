import { Controller, Get, Param } from "@nestjs/common";
import { RuleBasedAnalysisService } from "./ai.service";

@Controller("markets")
export class AiController {
  constructor(private ai: RuleBasedAnalysisService) {}

  @Get(":id/analysis")
  analysis(@Param("id") id: string) {
    return this.ai.analyzeMarket(id);
  }
}
