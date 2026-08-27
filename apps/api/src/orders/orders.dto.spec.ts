import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { OrderSideDto, OrderTypeDto, OutcomeSideDto, PlaceOrderDto } from "./orders.dto";

const base = {
  marketId: "m1",
  outcome: OutcomeSideDto.YES,
  side: OrderSideDto.BUY,
  orderType: OrderTypeDto.LIMIT,
  quantity: 10,
};

function errorsFor(input: Record<string, unknown>) {
  return validateSync(plainToInstance(PlaceOrderDto, input));
}

describe("PlaceOrderDto validation (spec §43)", () => {
  it("accepts a valid limit order", () => {
    expect(errorsFor({ ...base, priceCents: 50 })).toHaveLength(0);
  });

  it("rejects price below 0.01 AFR", () => {
    expect(errorsFor({ ...base, priceCents: 0 }).length).toBeGreaterThan(0);
  });

  it("rejects price above 0.99 AFR", () => {
    expect(errorsFor({ ...base, priceCents: 100 }).length).toBeGreaterThan(0);
  });

  it("rejects non-integer price", () => {
    expect(errorsFor({ ...base, priceCents: 50.5 }).length).toBeGreaterThan(0);
  });

  it("rejects zero or negative quantity", () => {
    expect(errorsFor({ ...base, priceCents: 50, quantity: 0 }).length).toBeGreaterThan(0);
    expect(errorsFor({ ...base, priceCents: 50, quantity: -5 }).length).toBeGreaterThan(0);
  });

  it("rejects unknown outcome/side values", () => {
    expect(errorsFor({ ...base, priceCents: 50, outcome: "MAYBE" }).length).toBeGreaterThan(0);
    expect(errorsFor({ ...base, priceCents: 50, side: "HOLD" }).length).toBeGreaterThan(0);
  });
});
