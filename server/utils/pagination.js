const { paginatedResponse } = require('./responseHandler');

// Pagination middleware
const paginate = (model) => {
  return async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    try {
      const total = await model.countDocuments();
      
      if (endIndex < total) {
        results.next = {
          page: page + 1,
          limit
        };
      }

      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit
        };
      }

      results.data = await model.find().limit(limit).skip(startIndex).exec();
      paginatedResponse(res, results.data, page, limit, total);
    } catch (error) {
      next(error);
    }
  };
};

module.exports = paginate;