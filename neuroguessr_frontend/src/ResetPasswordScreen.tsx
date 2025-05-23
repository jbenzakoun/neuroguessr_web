import type { TFunction } from 'i18next';
import './ResetPasswordScreen.css'
import { useEffect, useRef, useState } from 'react';

function ResetPasswordScreen({ t, callback }: { t: TFunction<"translation", undefined>, callback: AppCallback }) {
    const [isCheckedToken, setIsCheckedToken] = useState<boolean>(false);
    const usernameInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);
    const confirmPasswordInput = useRef<HTMLInputElement>(null);
    const [recoveryErrorText, setRecoveryErrorText] = useState<string>("");
    const [recoverySuccessText, setRecoverySuccessText] = useState<string>("");
    const [userId, setUserId] = useState<string|null>(null);
    const [resetToken, setResetToken] = useState<string|null>(null);

    useEffect(() => {
        handleCheckToken()
    }, [])

    const handleCheckToken = async () => {
        // Extract token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userId = urlParams.get('id');
        setUserId(userId)
        setResetToken(token)

        // Validate token before showing the form
        if (!token || !userId) {
          setRecoveryErrorText(t('error_invalid_token'));
        }
              
        try {
          const response = await fetch('/api/validate-reset-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId, token }),
          });

          const result = await response.json();

          if (!response.ok) {
            setRecoveryErrorText(t('error_invalid_token'));
          } else {
            setIsCheckedToken(true)
          }
        } catch (error) {
          console.error('Error validating token:', error);
          setRecoveryErrorText(t('server_error'))
        }

    }

    const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const newPassword = passwordInput.current?.value;
        const confirmPassword = confirmPasswordInput.current?.value;
        console.log(newPassword, confirmPassword)
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

          // Validate passwords
          if (!newPassword || !confirmPassword) {
            setRecoveryErrorText(t('error_empty_fields'));
            return;
          }

          if (newPassword !== confirmPassword) {
            setRecoveryErrorText(t('error_password_mismatch'));
            return;
          }

          if (!complexityRegex.test(newPassword)) {
            setRecoveryErrorText(t('error_password_complexity'));
            return
          }

          if (!resetToken || !userId) {
            setRecoveryErrorText(t('error_invalid_token')); 
            return;
          }
                
          // Send the new password to the server
          try {
            const response = await fetch('/api/reset-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id:userId, token:resetToken, password:newPassword }),
            });

            const result = await response.json();

            if (response.ok) {
              setRecoverySuccessText(t('password_reset_success'));
              callback.loginWithToken(result.token);
              callback.gotoPage("welcome");
            } else {
              setRecoveryErrorText(result.message || t('password_reset_failed'));
            }
          } catch (error) {
            console.error('Error resetting password:', error);
            setRecoveryErrorText(t('server_error'));
          }
    }
    return(
    <div className="page-container">
        <form id="reset-password-form" onSubmit={handleResetPassword}>
          <div className="register-box">
              <h2>{t("reset_password_header")}</h2>
              <table className="login-element">
                  {isCheckedToken && <tr className="password-reset-units">
                      <td>
                          <label id="password-label" htmlFor="password">{t("new_password_label")}</label>
                      </td>
                      <td>
                          <input type="password" id="password" name="password" required ref={passwordInput} />
                      </td>
                  </tr> }
                  {isCheckedToken && <tr className="password-reset-units">
                      <td colSpan={2} id="password-helper" className="password-helper">
                          {t("password_helper")}
                      </td>
                  </tr> }
                  {isCheckedToken && <tr className="password-reset-units">
                      <td>
                          <label id="confirm_password-label" htmlFor="confirm_password">{t("login_confirm_password")}</label>
                      </td>
                      <td>
                          <input type="password" id="confirm_password" name="confirm_password" required ref={confirmPasswordInput} />
                      </td>
                  </tr>}
                  {recoveryErrorText &&
                    <tr><td colSpan={2} id="recovery_error" className="recovery-message">{recoveryErrorText}</td></tr>}
                  {recoverySuccessText &&
                    <tr><td colSpan={2} id="recovery_success" className="recovery-message">{recoverySuccessText}</td></tr>}
              </table>

              {isCheckedToken && <button type="submit" className="password-reset-units">{t("reset_password_button")}</button>}
          </div>
      </form>
    </div>
    )
}

export default ResetPasswordScreen;