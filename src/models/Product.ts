import { Model } from 'objection';
import Order from './Order';

class Product extends Model {
  static tableName = 'products';

  id!: number;
  name!: string;
  sku!: string;
  description?: string;
  price!: number;
  stock!: number;
  created_at?: Date;
  updated_at?: Date;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'sku', 'price', 'stock'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        sku: { type: 'string', minLength: 1, maxLength: 64 },
        description: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        stock: { type: 'integer', minimum: 0 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    };
  }

  static get relationMappings() {
    return {
      orders: {
        relation: Model.ManyToManyRelation,
        modelClass: Order,
        join: {
          from: 'products.id',
          through: {
            from: 'orders_items.product_id',
            to: 'orders_items.order_id',
          },
          to: 'orders.id',
        }
      }
    };
  }
}

export default Product;
