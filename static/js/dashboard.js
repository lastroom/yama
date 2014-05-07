$(document).ready(function() {
    
    $('input[type="checkbox"]').on('click', function() {
        var name = $(this).attr('id');
        console.log('input[name="' + name + '"]');
        $('input[name="' + name + '"]').val(this.checked);
    });

});