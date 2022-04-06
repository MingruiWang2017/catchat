from flask import Blueprint, render_template, redirect, url_for, request, current_app
from flask_login import current_user, login_required
from flask_socketio import emit

from catchat.extensions import db, socketio
from catchat.forms import ProfileForm
from catchat.models import Message, User
from catchat.utils import flash_errors

chat_bp = Blueprint('chat', __name__)

online_users = []  # 用于保存当前在线用户


@socketio.on('new message')
def new_message(message_body):
    """监听客户端发送来的new message事件，并进行广播"""
    message = Message(author=current_user._get_current_object(), body=message_body)
    db.session.add(message)
    db.session.commit()
    emit('new message',
         {'message_html': render_template('chat/_message.html', message=message)},
         broadcast=True)  # 将消息广播给所有用户


@socketio.on('new message', namespace='/anonymous')
def new_anonymous_message(message_body):
    """/anonymous命名空间下的匿名聊天室, 这里的消息不保存"""
    avatar = 'https://cravatar.cn/avatar/?d=mp'
    nickname = 'Anonymous'
    emit('new message',
         {'message_html': render_template('chat/_anonymous_message.html',
                                          message=message_body,
                                          avatar=avatar,
                                          nickname=nickname)},
         broadcast=True, namespace='/anonymous')


@socketio.on('connect')
def connect():
    """当有客户端connect时，更新在线人数"""
    global online_users
    if current_user.is_authenticated and current_user.id not in online_users:
        online_users.append(current_user.id)
    emit('user count', {'count': len(online_users)}, broadcast=True)


@socketio.on('disconnect')
def disconnect():
    """当客户端disconnect时，更新在线人数"""
    global online_users
    if current_user.is_authenticated and current_user.id in online_users:
        online_users.remove(current_user.id)
    emit('user count', {'count': len(online_users)}, broadcast=True)


@chat_bp.route('/')
def home():
    amount = current_app.config['CATCHAT_MESSAGE_PER_PAGE']
    messages = Message.query.order_by(Message.timestamp.asc())[-amount:]
    user_amount = User.query.count()
    return render_template('chat/home.html', messages=messages, user_amount=user_amount)


@chat_bp.route('/anonymous')
def anonymous():
    """匿名聊天室视图函数"""
    return render_template('chat/anonymous.html')


@chat_bp.route('/messages')
def get_messages():
    """分页获取消息"""
    page = request.args.get('page', 1, type=int)
    pagination = Message.query.order_by(Message.timestamp.desc()).paginate(
        page, per_page=current_app.config['CATCHAT_MESSAGE_PER_PAGE'])  # 按时间降序获取消息
    messages = pagination.items
    return render_template('chat/_messages.html', messages=messages[::-1])  # 在按照时间升序渲染消息


@chat_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    form = ProfileForm()
    if form.validate_on_submit():
        current_user.nickname = form.nickname.data
        current_user.github = form.github.data
        current_user.website = form.website.data
        current_user.bio = form.bio.data
        db.session.commit()
        return redirect(url_for('.home'))
    flash_errors(form)
    return render_template('chat/profile.html', form=form)


@chat_bp.route('/profile/<user_id>')
def get_profile(user_id):
    user = User.query.get_or_404(user_id)
    return render_template('chat/_profile_card.html', user=user)
