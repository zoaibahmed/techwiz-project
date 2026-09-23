import {
  checkoutSchema,
  modifyOrderItemsSchema,
  farmerStatusTransitionSchema,
} from '../validation/order.schema.js';
import {
  checkoutService,
  listCustomerOrdersService,
  getCustomerOrderByIdService,
  modifyCustomerOrderService,
  cancelCustomerOrderService,
  listFarmerOrdersService,
  getFarmerOrderByIdService,
  updateFarmerOrderStatusService,
} from '../services/order.service.js';

export async function checkout(req, res, next) {
  try {
    const validatedData = checkoutSchema.parse(req.body);
    const result = await checkoutService(req.user.id, validatedData);

    const statusCode = result.isIdempotentReplay ? 200 : 201;
    res.status(statusCode).json({
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listCustomerOrders(req, res, next) {
  try {
    const orders = await listCustomerOrdersService(req.user.id, req.query);
    res.status(200).json({
      data: orders,
      meta: {
        total: orders.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerOrder(req, res, next) {
  try {
    const order = await getCustomerOrderByIdService(req.user.id, req.params.id);
    res.status(200).json({
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function modifyCustomerOrder(req, res, next) {
  try {
    const { items } = modifyOrderItemsSchema.parse(req.body);
    const order = await modifyCustomerOrderService(req.user.id, req.params.id, items);
    res.status(200).json({
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelCustomerOrder(req, res, next) {
  try {
    const { reason } = req.body || {};
    const order = await cancelCustomerOrderService(req.user.id, req.params.id, reason);
    res.status(200).json({
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listFarmerOrders(req, res, next) {
  try {
    const orders = await listFarmerOrdersService(req.user.id, req.query);
    res.status(200).json({
      data: orders,
      meta: {
        total: orders.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFarmerOrder(req, res, next) {
  try {
    const order = await getFarmerOrderByIdService(req.user.id, req.params.id);
    res.status(200).json({
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFarmerOrderStatus(req, res, next) {
  try {
    const { status, reason } = farmerStatusTransitionSchema.parse(req.body);
    const order = await updateFarmerOrderStatusService(req.user.id, req.params.id, status, reason);
    res.status(200).json({
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
