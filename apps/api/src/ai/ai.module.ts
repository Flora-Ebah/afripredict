import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { RuleBasedAnalysisService } from "./ai.service";

@Module({
  controllers: [AiController],
  providers: [RuleBasedAnalysisService],
})
export class AiModule {}
