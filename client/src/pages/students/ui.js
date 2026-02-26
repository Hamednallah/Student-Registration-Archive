/**
 * وحدة واجهة المستخدم للطلاب
 * توفر وظائف مساعدة لعرض الرسائل وإدارة العناصر في واجهة المستخدم
 */

/**
 * عرض رسالة نجاح للمستخدم
 * @param {string} message نص الرسالة
 * @param {number} duration مدة عرض الرسالة بالميلي ثانية
 */
function showSuccess(message, duration = 3000) {
    showMessage(message, 'success', duration);
}

/**
 * عرض رسالة خطأ للمستخدم
 * @param {string} message نص الرسالة
 * @param {number} duration مدة عرض الرسالة بالميلي ثانية
 */
function showError(message, duration = 5000) {
    showMessage(message, 'error', duration);
}

/**
 * عرض رسالة معلومات للمستخدم
 * @param {string} message نص الرسالة
 * @param {number} duration مدة عرض الرسالة بالميلي ثانية
 */
function showInfo(message, duration = 3000) {
    showMessage(message, 'info', duration);
}

/**
 * عرض رسالة للمستخدم
 * @param {string} message نص الرسالة
 * @param {string} type نوع الرسالة (success, error, info)
 * @param {number} duration مدة عرض الرسالة بالميلي ثانية
 */
function showMessage(message, type = 'info', duration = 3000) {
    let container = document.getElementById('message-container');
    
    // إنشاء حاوية الرسائل إذا لم تكن موجودة
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // إنشاء عنصر الرسالة
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;
    messageElement.innerHTML = `
        <div class="message-icon">
            <i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        </div>
        <div class="message-content">${message}</div>
        <button class="message-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // إضافة أنماط CSS
    messageElement.style.display = 'flex';
    messageElement.style.alignItems = 'center';
    messageElement.style.padding = '10px 15px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.margin = '5px 0';
    messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    messageElement.style.animation = 'slideIn 0.3s ease-out';
    messageElement.style.backgroundColor = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1';
    messageElement.style.color = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460';
    messageElement.style.width = '300px';
    
    // إضافة الرسالة للحاوية
    container.appendChild(messageElement);
    
    // حذف الرسالة بعد المدة المحددة
    setTimeout(() => {
        if (messageElement.parentElement) {
            messageElement.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageElement.parentElement) {
                    messageElement.remove();
                }
            }, 290);
        }
    }, duration);
    
    // إضافة أنماط الرسوم المتحركة إذا لم تكن موجودة
    if (!document.getElementById('message-animations')) {
        const style = document.createElement('style');
        style.id = 'message-animations';
        style.innerHTML = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * إظهار/إخفاء قسم من واجهة المستخدم
 * @param {string} elementId معرف العنصر
 * @param {boolean} show حالة الإظهار
 */
function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * تعطيل/تمكين عنصر في واجهة المستخدم
 * @param {string} elementId معرف العنصر
 * @param {boolean} disabled حالة التعطيل
 */
function toggleDisabled(elementId, disabled) {
    const element = document.getElementById(elementId);
    if (element) {
        element.disabled = disabled;
    }
}

/**
 * تبديل حالة معالجة النموذج
 * @param {boolean} isProcessing هل العملية جارية
 * @param {string} formId معرف النموذج
 */
function toggleFormProcessing(isProcessing, formId = 'studentForm') {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = isProcessing;
        submitButton.innerHTML = isProcessing 
            ? '<span class="spinner small"></span> <span data-i18n="processing">Processing...</span>' 
            : '<span data-i18n="saveChanges">Save Changes</span>';
    }
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.disabled = isProcessing;
    });
}

// تصدير الوظائف
export {
    showSuccess,
    showError,
    showInfo,
    showMessage,
    toggleElement,
    toggleDisabled,
    toggleFormProcessing
}; 