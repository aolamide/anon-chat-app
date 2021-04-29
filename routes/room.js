const { createRoom } = require('../controllers/room');

const router = require('express').Router();

router.post(
  '/room',
  createRoom
);

module.exports = router;