import os

from flask import flash, redirect, url_for, Blueprint, abort
from flask_login import login_user, current_user

from catchat.extensions import oauth, db
from catchat.models import User

oauth_bp = Blueprint('oauth', __name__)

github = oauth.remote_app(
    name='github',
    consumer_key=os.getenv('GITHUB_CLIENT_ID'),
    consumer_secret=os.getenv('GITHUB_CLIENT_SECRET'),
    request_token_params={'scope': 'user'},
    base_url='https://api.github.com/',
    request_token_url=None,
    access_token_method='POST',
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
)

google = oauth.remote_app(
    name='google',
    consumer_key=os.getenv('GOOGLE_CLIENT_ID'),
    consumer_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    request_token_params={'scope': 'email'},
    base_url='https://www.googleapis.com/oauth2/v1/',
    request_token_url=None,
    access_token_method='POST',
    access_token_url='https://accounts.google.com/o/oauth2/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
)

providers = {
    'github': github,
    'google': google
}

# 获取用户信息url的附加查询参数，用来指定额外获取的用户信息
profile_endpoints = {
    'github': 'user',
    'google': 'userinfo'
}


def get_social_profile(provider, access_token):
    """向oauth资源服务器发送GET请求获取并解析用户信息"""
    profile_endpoint = profile_endpoints[provider.name]
    response = provider.get(profile_endpoint, token=access_token)

    print("---" * 20)
    print(response.data)
    print("---" * 20)

    if provider.name == 'google':
        username = response.data.get('name')
        website = response.data.get('link')
        github = ''
        email = response.data.get('email')
        bio = ''
    elif provider.name == 'github':
        """
        
        """
        username = response.data.get('name')
        website = response.data.get('blog')
        github = response.data.get('html_url')
        email = response.data.get('email')
        bio = response.data.get('bio')
    if email is None:
        flash('Please set a public email.')
        return redirect('auth.login')
    return username, website, github, email, bio


@oauth_bp.route('/login/<provider_name>')
def oauth_login(provider_name):
    """第三方登录的视图函数，用来获取remote_app对象，提供对应回调函数，进行认证"""
    if provider_name not in providers.keys():
        abort(404)

    if current_user.is_authenticated:
        return redirect(url_for('chat.home'))

    callback = url_for('.oauth_callback', provider_name=provider_name, _external=True)
    return providers[provider_name].authorize(callback=callback)


@oauth_bp.route('/callback/<provider_name>')
def oauth_callback(provider_name):
    if provider_name not in providers.keys():
        abort(404)

    provider = providers[provider_name]
    response = provider.authorized_response()

    if response is not None:
        access_token = response.get('access_token')
    else:
        access_token = None

    if access_token is None:
        flash('Access denied, please try again.')
        return redirect(url_for('auth.login'))

    username, website, github, email, bio = get_social_profile(provider, access_token)

    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(email=email, nickname=username, website=website,
                    github=github, bio=bio)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('chat.profile'))
    login_user(user, remember=True)
    return redirect(url_for('chat.home'))
