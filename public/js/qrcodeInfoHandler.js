$(() => {
    $('.qrcode-wrapper').each(function () {
        var indicator = $(this).children('.code').children('.url').children('.collapse_indicator');
        var infos = $(this).children('.infos');

        //TODO: Always opened
        indicator.animateRotate(90, 400);
        $(infos).show(500);
        
        $(indicator).click(function (e) {
            e.preventDefault();
            if (indicator.attr('style') == 'transform: rotate(90deg);') {
                indicator.animateRotate(0, 400);
                $(infos).hide(500);
            } else {
                indicator.animateRotate(90, 400);
                $(infos).show(500);
            }
        });
    });
});

$.fn.animateRotate = function (deg, duration) {
    this.animate(
        { deg: deg },
        {
            duration: duration,
            step: function (now) {
                $(this).css({ transform: 'rotate(' + now + 'deg)' });
            },
        }
    );
};
