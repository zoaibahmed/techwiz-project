import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMarket, useAction, Favourite } from "./ui";
import { money } from "../data/market";
import type { Product } from "../data/market";

export function HarvestItem({ product }: { product: Product }) {
  const s = useMarket();
  const act = useAction();
  const reduce = useReducedMotion();
  const quantity = s.basket[product.id] ?? 0;
  return (
    <article className="harvest-item">
      <Link to={`/products/${product.id}`} className="harvest-photo">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span>{product.stock - product.reserved} available</span>
      </Link>
      <Favourite id={product.id} />
      <small>{s.farmers.find((f) => f.id === product.farmerId)?.name}</small>
      <Link to={`/products/${product.id}`}>
        <h3>{product.name}</h3>
      </Link>
      <div className="harvest-price">
        <span>
          <strong>{money(product.price)}</strong>
          <small> / {product.unit}</small>
        </span>
        <motion.button
          key={quantity}
          initial={false}
          animate={{ scale: reduce ? 1 : [1, 1.15, 1] }}
          aria-label={`Add ${product.name} to basket`}
          disabled={quantity >= product.stock - product.reserved}
          onClick={() =>
            act(
              { type: "basket", id: product.id, quantity: quantity + 1 },
              `${product.name} added to your sample basket.`,
            )
          }
        >
          {quantity ? (
            <>
              <Check size={14} />
              <span>{quantity}</span>
            </>
          ) : (
            <Plus size={17} />
          )}
        </motion.button>
      </div>
    </article>
  );
}
