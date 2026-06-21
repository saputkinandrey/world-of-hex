import { config } from "./economy-config.mjs";

const invalidGoods = config.goods.filter(
    (good) =>
        typeof good.price !== "number" ||
        !Number.isFinite(good.price) ||
        good.price < 0,
);
if (invalidGoods.length > 0) {
    throw new Error(
        `Every good must define a non-negative numeric price. Invalid goods: ${invalidGoods.map((good) => good.name).join(", ")}`,
    );
}

console.log("Goods define editable prices.");
