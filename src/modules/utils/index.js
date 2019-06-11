const paginator = (pagination, target, range) => {
  pagination.showStartEllipses = false
  pagination.showEndEllipses = false
  pagination.showEllipses = false
  pagination.showPrevious = true
  pagination.showNext = true

  pagination.page += 1
  pagination.maxPage += 1

  if (pagination.page - range - 1 <= 1) {
    pagination.startPage = 1
  } else {
    pagination.startPage = pagination.page - range
    pagination.showStartEllipses = true
    pagination.showEllipses = true
  }

  if (pagination.page + range + 1 >= pagination.maxPage) {
    pagination.endPage = pagination.maxPage
  } else {
    pagination.endPage = pagination.page + range
    pagination.showEndEllipses = true
    pagination.showEllipses = true
  }

  if (pagination.page <= 1) pagination.showPrevious = false
  if (pagination.page >= pagination.maxPage) pagination.showNext = false
  pagination.pageLoop = Array.from(Array(pagination.endPage - pagination.startPage + 1), (_, x) => x + pagination.startPage)
  pagination.previousPage = pagination.page - 1
  pagination.nextPage = pagination.page + 1
  pagination.target = target
  return pagination
}
exports.paginator = paginator
