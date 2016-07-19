from django.contrib.auth.models import User
import re

class UserManager:
    """Class to create users"""
    error_message=""

    """
    This method returns false if the user creation did not work.
    If false, then the errormessage is filled
    """
    def createUser(self,firstname,lastname,username,email,password):
        if not self.check_email(email):
            return None
            
        if not self.check_password(password):
            return None
            
        user = User.objects.create_user(username, email, password)
        user.first_name=firstname
        user.last_name=lastname
        user.save()
        return user

    def check_email(self,email):
        pattern = re.compile("^.*@.*\..*$")
        match   = pattern.match(email)
        if match == None:
            self.error_message = "The email is not well formated"
        return match

    def check_password(self,password):
        """
        Verify the strength of the password
        """
        # Exists?
        if password is None:
            self.error_message="No password given"
            return False

        # calculating the length
        if len(password) < 8:
            self.error_message="password too short (< 8)"
            return False
        
        # searching for digits
        if re.search(r"\d", password) is None:
            self.error_message="password does not contain at least one digit"
            return False

        # searching for uppercase
        if re.search(r"[A-Z]", password) is None or re.search(r"[a-z]", password) is None:
            self.error_message="password does not contain uppercase and lowercase letters"
            return False


        return True
