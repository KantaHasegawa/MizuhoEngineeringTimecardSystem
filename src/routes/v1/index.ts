import express from 'express';
const router = express.Router();
import documentClient from "../../dbconnect";

router.get("/api/v1/", (req: express.Request, res: express.Response) => {
  const env = process.env.NODE_ENV
  res.json({ message: `env is ${env}` });
});

router.get("/api/v1/records", (req: express.Request, res: express.Response) => {
  documentClient
    .scan({
      TableName: "Timecards",
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }));
});

router.use('/api/v1/user', require('./user'));
router.use('/api/v1/auth', require('./auth'));
router.use('/api/v1/workspot', require('./workspot'));
router.use('/api/v1/timecard', require('./timecard'));

module.exports = router;
