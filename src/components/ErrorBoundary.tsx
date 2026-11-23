import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'حدث خطأ غير متوقع',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-[100dvh] w-full bg-[#14081A] text-[#F4E8D8] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#FF4D8D]/35 bg-[#1B0A22]/95 p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF4D8D]/15 border border-[#FF4D8D]/30 text-[#FF4D8D]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-calligraphy text-3xl font-bold text-[#F4E8D8] mb-2">
              عذراً، حدث خطأ مفاجئ
            </h1>
            <p className="text-sm text-[#B98A9E] leading-relaxed mb-6">
              توقفت الصفحة مؤقتاً بسبب مشكلة غير متوقعة. يمكنك إعادة تحميل الصفحة للمتابعة من حيث توقفت.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#14081A] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
