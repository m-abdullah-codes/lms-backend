class ErrorHandler extends Error {
    statusCode: number;

    constructor(message: any, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ErrorHandler;