//redirect to https in production

const redirectToHttps = (req, res, next) => {
  if(process.env.NODE_ENV === 'production') {
    return (req.headers["x-forwarded-proto"] !== "https"
    ? res.redirect(302, "https://" + req.hostname + req.originalUrl)
    : next());
  }
  next()
}

module.exports = redirectToHttps;