$(document).ready(function () {
    // var socket = io.connect();
    var popupLoading = '<i class="notched circle loading icon green"></i> Loading...';
    var ENTER_KEY = 13;

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });

    // 处理socketio事件
    socket.on('user count', function (data) {
        $('#user-count').html(data.count);
    });

    socket.on('new message', function (data) {
        $('.messages').append(data.message_html);  // 将新消息添加到消息列表中
        flask_moment_render_all();  // 渲染消息中的时间戳
        scrollToBottom();  // 滚动到页面底部新消息处
        activateSemantics();
    });

    function new_message(e) {
        var $textarea = $ ('#message-textarea');
        var message_body = $textarea.val().trim(); // 获取消息内容
        if (e.which === ENTER_KEY && !e.shiftKey && message_body) {  // 如果消息不为空，用户按下回车，同时没按shift
            e.preventDefault();  // 阻止默认行为，即按回车换行
            socket.emit('new message', message_body);  // 发送事件信息
            $textarea.val('')  // 清空输入框
        }
    }

    // submit message
    $('#message-textarea').on('keydown', new_message.bind(this));

    // open message modal on mobile
    $('#message-textarea').focus(function () {
        if (screen.width < 600) {
            $('#mobile-new-message-modal').modal('show');
            $('#mobile-message-textarea').focus()
        }
    });

    // 移动端发送消息
    $('#send-button').on('click', function () {
        var $mobile_textarea = $('#mobile-message-textarea');
        var message = $mobile_textarea.val();
        if (message.trim() !== '') {
            socket.emit('mew message', message);
            $mobile_textarea.val('')
        }
    });

    function scrollToBottom() {
        var $messages = $('.messages');
        $messages.scrollTop($messages[0].scrollHeight);
    }

    function activateSemantics() {
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();

        $('.message .close').on('click', function () {
            $(this).closest('.message').transition('fade');
        });

        $('#toggle-sidebar').on('click', function () {
            $('.menu.sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
        });

        $('.pop-card').popup({
            inline: true,
            on: 'hover',
            hoverable: true,
            html: popupLoading,
            delay: {
                show: 200,
                hide: 200
            },
            onShow: function () {
                var popup = this;
                popup.html(popupLoading);
                $.get({
                    url: $(popup).prev().data('href')
                }).done(function (data) {
                    popup.html(data);
                }).fail(function () {
                    popup.html('Failed to load profile.');
                });
            }
        });
    }

    function init() {
        activateSemantics();
        scrollToBottom();
    }

    init();

});
