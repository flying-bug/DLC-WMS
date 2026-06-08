/**
 * Reusable Google "G" logo SVG.
 * Dùng chung cho nút Google và modal picker.
 */
function GoogleIcon({ size = 24, className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width={size}
            height={size}
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="#EA4335"
                d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.1-6.1C34.36 3.02 29.47 1 24 1
           14.82 1 7.01 6.48 3.6 14.24l7.1 5.52C12.37 13.67 17.73 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.72c-.55 2.99-2.22 5.52-4.72
           7.22l7.26 5.64C43.44 37.5 46.5 31.48 46.5 24.5z"
            />
            <path
                fill="#FBBC05"
                d="M10.7 28.24A14.56 14.56 0 0 1 9.5 24c0-1.48.26-2.91.7-4.24l-7.1-5.52
           A23.93 23.93 0 0 0 0 24c0 3.87.93 7.52 2.57 10.74l8.13-6.5z"
            />
            <path
                fill="#34A853"
                d="M24 47c5.47 0 10.06-1.81 13.42-4.9l-7.26-5.64c-1.81 1.22-4.12
           1.94-6.16 1.94-6.27 0-11.63-4.17-13.3-9.76l-8.13 6.5C7.01 41.52 14.82 47 24 47z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
        </svg>
    );
}

export default GoogleIcon;
