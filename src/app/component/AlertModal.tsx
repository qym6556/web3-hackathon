"use client";
import { useEffect, useState } from "react";
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, InfoCircleFilled } from "@ant-design/icons";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  type?: AlertType;
  onClose: () => void;
}

const iconMap = {
  success: <CheckCircleFilled className="text-green-500" />,
  error: <CloseCircleFilled className="text-red-500" />,
  warning: <ExclamationCircleFilled className="text-yellow-500" />,
  info: <InfoCircleFilled className="text-blue-500" />,
};

export default function AlertModal({ isOpen, message, type = "info", onClose }: AlertModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"}`}>
      <div
        className={`flex items-center px-4 py-3 rounded-md shadow-lg bg-white border ${
          type === "success" ? "border-green-100" : type === "error" ? "border-red-100" : type === "warning" ? "border-yellow-100" : "border-blue-100"
        }`}
      >
        <div className="text-xl mr-3">{iconMap[type]}</div>
        <span className="text-gray-800">{message}</span>
      </div>
    </div>
  );
}
