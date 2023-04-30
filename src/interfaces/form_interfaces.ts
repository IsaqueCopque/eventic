export interface FormFieldState { 
    value?: string | Date; 
    validators?: any[]; 
    valid?: boolean; 
    errorMessage?: string 
}

export interface ValidatorResponse {
    isValid: boolean;
    errorMessage: string;
}