declare module 'qrcode' {
  function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>
  function toCanvas(canvas: HTMLCanvasElement, text: string, options?: Record<string, unknown>): Promise<void>
  function toString(text: string, options?: Record<string, unknown>): Promise<string>
}
