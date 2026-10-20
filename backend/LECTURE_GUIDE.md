# How this backend follows your lecture slides

This version uses CommonJS (`require` and `module.exports`), separate Mongoose models, `express.Router()` files and explicit `try/catch` blocks that call `next(err)`. It keeps the same API paths and JSON response structure as the earlier package, so a frontend already written for it does not need a different API contract.

## Where to start

| Read this file | What it teaches | Matching lecture |
| --- | --- | --- |
| src/server.js | Connect to MongoDB first, then call app.listen | Express with MongoDB, slide 13 |
| src/app.js | Configure middleware and mount routers | Express continuation, slides 9–11 |
| src/models/Category.js | required, unique, enum, default and timestamps | Express with MongoDB, slide 12 |
| src/models/Component.js | Part schema and category reference | Express with MongoDB, schemas and CRUD |
| src/routes/categories.js | Five explicit CRUD routes with try/catch | Express continuation, REST and Router; MongoDB slide 21 |
| src/routes/components.js | req.params, req.query and price filtering | Express introduction, slides 19–22 |
| src/middleware/requestLogger.js | Logger and next() | Express introduction, slides 23–24 |
| src/middleware/errors.js | JSON 404 and four-argument error handler | Express continuation, slides 13–14 |
| src/config/database.js | Read MONGO_URI and connect with Mongoose | Express with MongoDB, slides 8–13 |
| .env.example and .gitignore | Configuration and protecting secrets | Express continuation, slide 15 |
| README.md frontend example | One configured axios instance | Express continuation, slide 25 |

## Trace one request

When the frontend asks for `/api/components/<id>`, app.js sends it to the component router. The route checks the ID and calls `Component.findById`. Mongoose reads MongoDB, then the route returns JSON. A malformed ID produces 400. A well-formed ID with no record produces 404. The catch block passes unexpected failures to the error middleware.

The actual route uses this pattern:

```javascript
router.get('/:id', async (req, res, next) => {
  try {
    id(req.params.id);
    const record = await Component.findById(req.params.id)
      .populate('categoryId');

    if (!record) {
      return res.status(404).json({ message: 'Component not found' });
    }

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});
```

`id()` is a helper in validation/input.js that rejects malformed ObjectIds. `populate()` replaces a category reference with its matching category document for easier display. `return` prevents sending a success response after sending 404.

## Updating records

The lecture demonstrates findByIdAndUpdate with new:true and runValidators:true. This package loads a document, calls record.set(input), then record.save(). Both are valid update approaches. The save() call automatically validates the document before writing it, so runValidators is not needed on that call. The setup upserts explicitly use runValidators:true.

## Extra project logic beyond the lectures

The slides teach single-record CRUD. The project additionally needs linked records and computed results:

- services/analysis.js contains price, budget, compatibility, comparison and power calculations. These functions do not connect to MongoDB.
- services/data.js contains reusable ID lookup, populated-build loading and build-selection rules.
- transaction() groups related database writes: all succeed, or MongoDB rolls them back. For example, deleting a build should also delete its buildItems without leaving a half-finished operation.
- revision and optimisticConcurrency help detect competing changes. touch() increments the revision and saves a document within the transaction so selecting a part and deleting that part cannot silently race.
- Transactions require Atlas or a local replica set. Keep your existing Atlas setup.
- RULES contain fixed check names. No user-provided JavaScript is executed.
- Automated tests are additional verification, not a requirement to understand before you learn the basic routes.

The package retains Express 5, but all asynchronous HTTP route handlers explicitly catch errors and call next(err) to follow the lecture pattern. The lectures' warning about rejected async handlers applies to Express 4; Express 5 also forwards rejected async handlers automatically. Explicit try/catch remains valid with Express 5.

The lecture shows port 3000; this package keeps port 5000 so your previous setup still works. Change PORT in .env if needed and update the frontend API URL. Node --watch supplies the development restart behavior without another dependency.

## First demonstration in Thunder Client

1. Run npm ci, configure .env, then npm run setup, npm run seed and npm run dev.
2. GET http://127.0.0.1:5000/api/health — expect 200 and connected.
3. GET http://127.0.0.1:5000/api/components — expect demo parts.
4. GET http://127.0.0.1:5000/api/components?maxPrice=4000 — see filtering.
5. POST http://127.0.0.1:5000/api/builds with `{"name":"My first build","budget":50000}` — expect 201. Copy data._id.
6. PATCH /api/builds/YOUR_ID with `{"budget":55000}` — expect 200.
7. GET /api/builds/banana — expect 400.
8. GET /api/builds/000000000000000000000001 — expect 404 if no such record exists.
9. DELETE /api/builds/YOUR_ID — expect 200. GET that same ID again — expect 404.

Use your own created build for deletion. Frontend forms will later send these same requests through axios.

## Updating from the previous ZIP

Extract this version into a fresh folder, copy only your existing .env into the new backend root and run npm ci. Do not overlay it on the old src folder: the old generic controllers and catalog router were removed. The same database, collection names, API URLs and JSON shapes are retained. Your stored data does not need to be deleted.

For an existing Git repository, replace the tracked source with this version, including deleting the old src/controllers folder and src/routes/catalog.js; retain your .git folder and uncommitted work. Review the diff before committing.
