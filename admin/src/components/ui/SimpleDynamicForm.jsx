import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const SimpleDynamicForm = ({ 
  fields, 
  onSubmit, 
  submitText = "Submit", 
  className,
  loading = false
}) => {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "checkbox") acc[field.name] = [];
      else acc[field.name] = "";
      return acc;
    }, {})
  );

  const [showPassword, setShowPassword] = useState(
    fields.reduce((acc, field) => {
      if (field.type === "password") acc[field.name] = false;
      return acc;
    }, {})
  );

  const handleChange = (e, field) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => {
        const newValues = checked
          ? [...prev[name], value]
          : prev[name].filter((val) => val !== value);
        return { ...prev, [name]: newValues };
      });
    } else {
      setFormData({ ...formData, [name]: value });
      if (field.onChange) field.onChange(value);
    }
  };

  const handleSelectChange = (value, fieldName, field) => {
    setFormData({ ...formData, [fieldName]: value });
    if (field.onChange) field.onChange(value);
  };

  const togglePassword = (name) => {
    setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6 w-full", className)}>
      {fields.map((field, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center space-x-2">
            {field.icon && (
              <div className="flex-shrink-0">
                {field.icon}
              </div>
            )}
            <Label 
              htmlFor={field.name} 
              className="text-sm font-medium text-foreground"
            >
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>

          {/* Text / Email / Number */}
          {["text", "email", "number"].includes(field.type) && (
            <Input
              id={field.name}
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="h-11"
            />
          )}

          {/* Password */}
          {field.type === "password" && (
            <div className="relative">
              <Input
                id={field.name}
                type={showPassword[field.name] ? "text" : "password"}
                name={field.name}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={(e) => handleChange(e, field)}
                disabled={field.disabled}
                required={field.required}
                className="h-11 pr-10"
              />
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
            <Textarea
              id={field.name}
              name={field.name}
              placeholder={field.placeholder}
              value={formData[field.name]}
              onChange={(e) => handleChange(e, field)}
              disabled={field.disabled}
              required={field.required}
              className="min-h-[100px] resize-vertical"
            />
          )}

          {/* Select Dropdown */}
          {field.type === "select" && (
            <Select
              value={formData[field.name]}
              onValueChange={(value) => handleSelectChange(value, field.name, field)}
              disabled={field.disabled}
              required={field.required}
            >
              <SelectTrigger className="h-11" id={field.name}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt, i) => {
                  // Handle both string options and object options with value/label
                  const optValue = typeof opt === 'object' ? opt.value : opt;
                  const optLabel = typeof opt === 'object' ? opt.label : opt;
                  return (
                    <SelectItem key={i} value={optValue || `option-${i}`}>
                      {optLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Radio Buttons */}
          {field.type === "radio" && (
            <div className="flex flex-wrap gap-6">
              {field.options?.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.name}-${i}`}
                    name={field.name}
                    value={opt}
                    checked={formData[field.name] === opt}
                    onChange={(e) => handleChange(e, field)}
                    disabled={field.disabled}
                    required={field.required}
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
          )}

          {/* Checkboxes */}
          {field.type === "checkbox" && (
            <div className="flex flex-wrap gap-6">
              {field.options?.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${field.name}-${i}`}
                    name={field.name}
                    value={opt}
                    checked={formData[field.name].includes(opt)}
                    onChange={(e) => handleChange(e, field)}
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
          )}
        </div>
      ))}

      <Button
        type="submit"
        className="w-full h-11 text-base font-medium"
        size="lg"
        disabled={loading}
      >
        {loading ? "Processing..." : submitText}
      </Button>
    </form>
  );
};

export default SimpleDynamicForm;
