exports.index = (req, res) => {
  return res.render('main/index', req.templateValues)
}