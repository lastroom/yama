$(document).ready(function() {

    $('input[type="checkbox"]').on('click', function() {
        var name = $(this).attr('id');
        $('input[name="' + name + '"]').val(this.checked);
    });

    $('.tagit').each(function() {
        var fieldOptions = $(this).data();

        var options = {
            fieldName: fieldOptions.fieldName,
            placeholderText: fieldOptions.placeholderText || "Type here...",
            beforeTagAdded: function(event, ui) {
                if (fieldOptions.pattern != "") {
                    var re = new RegExp(fieldOptions.pattern);
                    if (!re.test(ui.tagLabel)) {
                        $(this).attr('style', 'border: 1px red solid');
                        return false;
                    }
                }
            },
            afterTagAdded: function(event, ui) {
                $(this).attr('style', 'border: 1px solid #dddddd;');
            }
        }
        $(this).tagit(options);
    });

    $('thead th.sort').each(function() {
        var _this = $(this);
        var sortField = _this.attr('data-sort');
        _this.on('click', function(e) {
            var filterForm = $('#filters form');
            var sortByField = $('input[name="sort_by"]', filterForm);
            var orderField = $('input[name="order"]', filterForm);
            // Reset order
            if (sortByField.val() !== sortField) {
                orderField.val(1);
            } else {
                orderField.val(-1 * orderField.val());
            }
            sortByField.val(sortField);

            filterForm.submit();
        });
    });
});