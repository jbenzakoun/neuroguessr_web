import type { TFunction } from 'i18next';
import './RegisterScreen.css'
import { useRef, useState } from 'react';

function RegisterScreen({ t, callback }: { t: TFunction<"translation", undefined>, callback: AppCallback }) {
  const usernameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const firstnameInput = useRef<HTMLInputElement>(null);
  const lastnameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmPasswordInput = useRef<HTMLInputElement>(null);
  const [registerErrorText, setRegisterErrorText] = useState<string>("");
  const [registerSuccessText, setRegisterSuccessText] = useState<string>("");
  
  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = usernameInput.current?.value;
    const email = emailInput.current?.value;
    const firstname = firstnameInput.current?.value;
    const lastname = lastnameInput.current?.value;
    const password = passwordInput.current?.value;
    const confirmPassword = confirmPasswordInput.current?.value;
    // Email format validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Validate password complexity
    const complexityOptions = {
      min: 8,
      lowerCase: 1,
      upperCase: 1,
      numeric: 1,
      symbol: 1,
      requirementCount: 4,
    };

    // Construct the regex dynamically based on complexityOptions
    const complexityRegexParts = [];
    if (complexityOptions.lowerCase) complexityRegexParts.push('(?=.*[a-z])');
    if (complexityOptions.upperCase) complexityRegexParts.push('(?=.*[A-Z])');
    if (complexityOptions.numeric) complexityRegexParts.push('(?=.*\\d)');
    if (complexityOptions.symbol) complexityRegexParts.push('(?=.*[@$!%*?&])');
    const complexityRegex = new RegExp(
      `^${complexityRegexParts.join('')}.{${complexityOptions.min},}$`
    );

    if (!username || !email || !firstname || !lastname || !password || !confirmPassword) {
      setRegisterErrorText(t('error_empty_fields'));
      return;
    } else {
      if (!emailRegex.test(email.trim())) {
        setRegisterErrorText(t('error_invalid_email'));
        return;
      }
      if (!complexityRegex.test(password)) {
        setRegisterErrorText(t('error_password_complexity'))
        return;
      } else if (password !== confirmPassword) {
        setRegisterErrorText(t('error_password_mismatch'));
        return;
      }
    }

    const formData = {
        username: username.trim(),
        email: email.trim(),
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        password: password.trim(),
    };

    try {
        // Send the data to the server
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (response.ok) {
            if(result.preverified){
                setRegisterErrorText("");
                setRegisterSuccessText(t('register_success_no_verification'));
                setTimeout(() => {
                    callback.gotoPage("login");
                }, 2000);
            } else {
                setRegisterErrorText("");
                setRegisterSuccessText(t('register_success'));
            }
        } else {
            setRegisterErrorText(result.message || t('register_failed')); 
        }
    } catch (error) {
        // Handle network or other errors
        console.error('Error submitting the form:', error);
        setRegisterErrorText(t('server_error'));
    }

  }

  return (
    <div className="page-container">
      <form id="register_form" onSubmit={handleRegister}>
        <div className="register-box">
          <h2>{t("register_mode")}</h2>
          <table className="login-element">
            <tr>
              <td>
                <label id="username-label" htmlFor="username">{t("login_username")}</label>
              </td>
              <td>
                <input type="text" id="username" name="username" ref={usernameInput} required />
              </td>
            </tr>
            <tr>
              <td>
                <label id="email-label" htmlFor="email">{t("login_email")}</label>
              </td>
              <td>
                <input type="email" id="email" name="email" ref={emailInput} required />
              </td>
            </tr>
            <tr>
              <td>
                <label id="firstname-label" htmlFor="firstname">{t("login_firstname")}</label>
              </td>
              <td>
                <input type="text" id="firstname" name="firstname" ref={firstnameInput} required />
              </td>
            </tr>
            <tr>
              <td>
                <label id="lastname-label" htmlFor="lastname">{t("login_lastname")}</label>
              </td>
              <td>
                <input type="text" id="lastname" name="lastname" ref={lastnameInput} required />
              </td>
            </tr>
            <tr>
              <td>
                <label id="password-label" htmlFor="password">{t("login_password")}</label>
              </td>
              <td>
                <input type="password" id="password" name="password" ref={passwordInput} required />
              </td>
            </tr>
            <tr>
              <td colSpan={2} id="password-helper" className="password-helper">
                {t("password_helper")}
              </td>
            </tr>
            <tr>
              <td>
                <label id="confirm_password-label" htmlFor="confirm_password">{t("login_confirm_password")}</label>
              </td>
              <td>
                <input type="password" id="confirm_password" name="confirm_password" ref={confirmPasswordInput} required />
              </td>
            </tr>
            {registerErrorText != "" && <tr>
              <td colSpan={2} id="register_error">
                {registerErrorText}
              </td>
            </tr>}
            {registerSuccessText != "" && <tr>
              <td colSpan={2} id="register_success">
                {registerSuccessText}
              </td>
            </tr>}
          </table>

          {registerSuccessText == "" && <button type="submit">{t("register_button")}</button>}
        </div>
      </form>
    </div>
  )
}

export default RegisterScreen
