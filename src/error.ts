const errors = new Map([
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [402, 'Payment Required'],
  [403, 'Forbidden'],
  [404, 'Not Found'],
  [405, 'Method Not Allowed'],
  [406, 'Not Acceptable'],
  [407, 'Proxy Authentication Required'],
  [408, 'Request Timeout'],
  [409, 'Conflict'],
  [410, 'Gone'],
  [411, 'Length Required'],
  [412, 'Precondition Failed'],
  [413, 'Payload Too Large'],
  [414, 'URL Too Long'],
  [415, 'Unsupported Media Type'],
  [416, 'Range Not Satisfiable'],
  [417, 'Expectation Failed'],
  [421, 'Misdirected Request'],
  [422, 'Unprocessable Entity'],
  [423, 'Locked'],
  [424, 'Failed Dependency'],
  [428, 'Precondition Required'],
  [429, 'Too Many Request'],
  [431, 'Request Header Fields Too Large'],
  [451, 'Unavailable For Legal Reasons'],
  [500, 'Internal Server Error'],
  [501, 'Not Implemented'],
  [502, 'Bad Gateway'],
  [503, 'Service Unavailable'],
  [504, 'Gateway Timeout'],
  [505, 'HTTP Version Not Supported'],
  [506, 'Variant Also Negotiates'],
  [507, 'Insufficient Storage'],
  [508, 'Loop Detected'],
  [510, 'Not Extended'],
  [511, 'Network Authentication Required']
]);

export class HttpStatusError extends Error {
  constructor(public readonly statusCode: number, readonly message: string) {
    super(message);

    if (!errors.has(statusCode)) {
      this.statusCode = 500;
    }

    Object.defineProperty(this, 'name', {
      configurable: true,
      enumerable: false,
      value: this.constructor.name,
      writable: true
    });

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpStatusError);
    }

  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      error: errors.get(this.statusCode)!,
      message: this.message
    };
  }
}
