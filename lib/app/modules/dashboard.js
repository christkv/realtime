/**
 *  Index
 **/
exports.index = function(db) {
  return function index(req, res) {
    res.render('dashboard/index', { title: 'Developer Separation Example', layout: null });
  }
}
