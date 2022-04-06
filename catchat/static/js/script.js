$(document).ready(function () {
    // var socket = io.connect();
    var popupLoading = '<i class="notched circle loading icon green"></i> Loading...';
    var message_count = 0;
    var ENTER_KEY = 13;

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });

    function scrollToBottom() {
        var $messages = $('.messages');
        $messages.scrollTop($messages[0].scrollHeight);
    }

    var page = 1;

    function load_messages() {
        var $messages = $('.messages');
        var position = $messages.scrollTop();
        if (position === 0 && socket.nsp !== '/anonymous') {
            page++;  // 叠加页数值
            $('.ui.loader').toggleClass('active');  // 激活加载滚动条
            $.ajax({
                url: messages_url,  // /messages 的url以提前在基模板定义
                type: 'GET',
                data: {page: page},  // 查询字符串page页数
                success: function (data) {
                    var before_height = $messages[0].scrollHeight;
                    $(data).prependTo(".messages").hide().fadeIn(800);  // 插入新获取的消息
                    var after_height = $messages[0].scrollHeight;
                    flask_moment_render_all();  // 渲染时间
                    $messages.scrollTop(after_height - before_height);  // 计算新加入消息的高度，进行跳转
                    $('.ui.loader').toggleClass('active');  // 关闭滚动条
                    activateSemantics();
                },
                error: function () {
                    alert('No more messages.');  // 请求返回404时，弹出提示消息
                    $('.ui.loader').toggleClass('active');
                }
            });
        }
    }

    $('.messages').scroll(load_messages);  // .messages类元素触发scroll事件时，就执行加载消息

    // 处理socketio事件
    socket.on('user count', function (data) {
        $('#user-count').html(data.count);
    });

    socket.on('new message', function (data) {
        // 实现状态栏消息提醒
        message_count++;
        if (!document.hasFocus()) {
            document.title = '(' + message_count + ')' + 'CatChat';
        }
        if (data.user_id !== current_user_id) {  // 当其他用户发送来消息时，进行提示
            messageNotify(data);
        }

        $('.messages').append(data.message_html);  // 将新消息添加到消息列表中
        flask_moment_render_all();  // 渲染消息中的时间戳
        scrollToBottom();  // 滚动到页面底部新消息处
        activateSemantics();
    });

    function new_message(e) {
        var $textarea = $('#message-textarea');
        var message_body = $textarea.val().trim(); // 获取消息内容
        if (e.which === ENTER_KEY && !e.shiftKey && message_body) {  // 如果消息不为空，用户按下回车，同时没按shift
            e.preventDefault();  // 阻止默认行为，即按回车换行
            socket.emit('new message', message_body);  // 发送事件信息
            $textarea.val('')  // 清空输入框
        }
    }

    // submit message
    $('#message-textarea').on('keydown', new_message.bind(this));

    // submit snippet 代码输入弹窗
    $('#snippet-button').on('click', function () {
        var $snippet_textarea = $('#snippet-textarea');
        var message = $snippet_textarea.val();  // 获取代码片段内容
        if (message.trim() !== '') {
            socket.emit('new message', message);
            $snippet_textarea.val('')  // 清空内容
        }
    });

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

    function messageNotify(data) {
        if (Notification.permission !== 'granted')
            Notification.requestPermission();  // 向用户请求通知权限
        else {
            var notification = new Notification("Message from" + data.nickname, {
                icon: data.gravatar,
                body: data.message_body.replace(/(<([^>]+)>)/ig, "")
            });

            notification.onclick = function () {
                window.open(root_url);
            };
            setTimeout(function () {
                notification.close()
            }, 4000);
        }
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

        $('#show-help-modal').on('click', function () {
            $('.ui.modal.help').modal({blurring: true}).modal('show');
        });

        $('#show-snippet-modal').on('click', function () {
            $('.ui.modal.snippet').modal({blurring: true}).modal('show');
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
        // 实现桌面系统通知
        document.addEventListener('DOMContentLoaded', function () {
            if (!Notification) {
                alert('Desktop notifications not available in your browser.');
                return;
            }

            if (Notification.permission !== 'granted')
                Notification.requestPermission();
        });

        $(window).focus(function () {  // 当窗口被激活时，清除消息计数
            message_count = 0;
            document.title = 'CatChat';
        });

        activateSemantics();
        scrollToBottom();
    }

    init();

});
