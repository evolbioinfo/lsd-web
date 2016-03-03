from controlers.UserManager import UserManager
from django import forms
from django.core import validators
from django.forms.utils import ErrorList
import re

class EmailField(forms.CharField):
    def validate(self, value):
        pattern = re.compile("^.*@.*\..*$")
        return pattern.match(value)

class RegistrationForm(forms.Form):
    """
    Form to create a new user
    """

    username = forms.CharField(label="",widget=forms.TextInput(attrs={'placeholder': 'User Name','class':'form-control input-perso'}),max_length=30,min_length=3,validators=[validators.validate_slug])
    firstname = forms.CharField(label="",widget=forms.TextInput(attrs={'placeholder': 'First Name','class':'form-control input-perso'}),max_length=30,min_length=3,validators=[validators.validate_slug])
    lastname  = forms.CharField(label="",widget=forms.TextInput(attrs={'placeholder': 'Last Name','class':'form-control input-perso'}),max_length=30,min_length=3,validators=[validators.validate_slug])

    email = EmailField(label="",widget=forms.TextInput(attrs={'placeholder': 'Email','class':'form-control input-perso'}),max_length=30,min_length=3)
    password1 = forms.CharField(label="",max_length=50,min_length=6,
                                widget=forms.PasswordInput(attrs={'placeholder': 'Password','class':'form-control input-perso'}))
    password2 = forms.CharField(label="",max_length=50,min_length=6,
                                widget=forms.PasswordInput(attrs={'placeholder': 'Confirm password','class':'form-control input-perso'}))

    #recaptcha = ReCaptchaField()

    #Override of clean method for password check
    def clean(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        um = UserManager()
        if password1 and password1 != password2:
            self._errors['password2'] = ErrorList([u"PasswLe mot de passe ne correspond pas."])
            
        if not um.check_password(password1):
            self._errors['password1'] = ErrorList([um.error_message])

        return self.cleaned_data

    #Override of save method for saving both User and Profil objects
    def save(self, datas):
        um = UserManager()
        username=datas['username']
        firstname=datas['firstname']
        lastname=datas['lastname']
        email=datas['email']
        password=datas['password1']
        user = um.createUser(firstname,lastname,username,email,password)
        return user

