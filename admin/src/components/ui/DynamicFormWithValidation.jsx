import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const DynamicFormWithValidation = ({ 
  fields, 
  onSubmit, 
  submitText = "Submit", 
  className,
  defaultValues = {},
  mode = "onChange" 
}) => {
  const form = useForm({
    defaultValues: fields.reduce((acc, field) => {
      if (field.type === "checkbox") {
        acc[field.name] = defaultValues[field.name] || [];
      } else {
        acc[field.name] = defaultValues[field.name] || "";
      }
      return acc;
    }, {}),
    mode,
  });

  const [showPassword, setShowPassword] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "password") acc[field.name] = false;
      return acc;
    }, {})
  );

  const togglePassword = (name) => {
    setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const getFieldRules = (field) => {
    const rules = {};
    
    if (field.required) {
      rules.required = `${field.label} is required`;
    }
    
    if (field.type === "email") {
      rules.pattern = {
        value: /^\S+@\S+$/i,
        message: "Please enter a valid email address"
      };
    }
    
    if (field.minLength) {
      rules.minLength = {
        value: field.minLength,
        message: `${field.label} must be at least ${field.minLength} characters`
      };
    }
    
    if (field.maxLength) {
      rules.maxLength = {
        value: field.maxLength,
        message: `${field.label} must be no more than ${field.maxLength} characters`
      };
    }

    if (field.validation) {
      rules.validate = field.validation;
    }
    
    return rules;
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(handleFormSubmit)} 
        className={cn("space-y-6 w-full", className)}
      >
        {fields.map((field, idx) => (
          <FormField
            key={idx}
            control={form.control}
            name={field.name}
            rules={getFieldRules(field)}
            render={({ field: formField, fieldState }) => (
              <FormItem>
                <div className="flex items-center space-x-2">
                  {field.icon && (
                    <div className="flex-shrink-0">
                      {field.icon}
                    </div>
                  )}
                  <FormLabel className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                </div>

                {/* Text / Email / Number */}
                {["text", "email", "number"].includes(field.type) && (
                  <FormControl>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className="h-11"
                      {...formField}
                    />
                  </FormControl>
                )}

                {/* Password */}
                {field.type === "password" && (
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword[field.name] ? "text" : "password"}
                        placeholder={field.placeholder}
                        disabled={field.disabled}
                        className="h-11 pr-10"
                        {...formField}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePassword(field.name)}
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    >
                      {showPassword[field.name] ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showPassword[field.name] ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                )}

                {/* Textarea */}
                {field.type === "textarea" && (
                  <FormControl>
                    <Textarea
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className="min-h-[100px] resize-vertical"
                      {...formField}
                    />
                  </FormControl>
                )}

                {/* Select Dropdown */}
                {field.type === "select" && (
                  <Select
                    onValueChange={(value) => {
                      formField.onChange(value);
                      if (field.onChange) field.onChange(value);
                    }}
                    defaultValue={formField.value}
                    disabled={field.disabled}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {field.options?.map((opt, i) => (
                        <SelectItem key={i} value={opt || `option-${i}`}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Radio Buttons */}
                {field.type === "radio" && (
                  <FormControl>
                    <div className="flex flex-wrap gap-6">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`${field.name}-${i}`}
                            value={opt}
                            checked={formField.value === opt}
                            onChange={(e) => formField.onChange(e.target.value)}
                            disabled={field.disabled}
                            className="h-4 w-4 text-primary border-2 border-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <Label 
                            htmlFor={`${field.name}-${i}`} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                )}

                {/* Checkboxes */}
                {field.type === "checkbox" && (
                  <FormControl>
                    <div className="flex flex-wrap gap-6">
                      {field.options?.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`${field.name}-${i}`}
                            value={opt}
                            checked={formField.value?.includes(opt) || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentValue = formField.value || [];
                              if (checked) {
                                formField.onChange([...currentValue, opt]);
                              } else {
                                formField.onChange(currentValue.filter(val => val !== opt));
                              }
                            }}
                            disabled={field.disabled}
                            className="h-4 w-4 text-primary border-2 border-muted-foreground rounded focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <Label 
                            htmlFor={`${field.name}-${i}`} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                )}
                
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium"
          size="lg"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Processing..." : submitText}
        </Button>
      </form>
    </Form>
  );
};

export default DynamicFormWithValidation;
