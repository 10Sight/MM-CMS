import React, { createContext, useContext, useEffect, useState } from 'react';

const InstallContext = createContext({
    installPrompt: null,
    showInstallPrompt: () => { },
    isInstallable: false,
});

export const useInstallPrompt = () => useContext(InstallContext);

export const InstallPromptProvider = ({ children }) => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            setIsInstallable(true);
            console.log("Captured beforeinstallprompt event");
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const showInstallPrompt = async () => {
        if (!installPrompt) {
            console.log("No install prompt available");
            return;
        }

        // Show the install prompt
        installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, so clear it
        setInstallPrompt(null);
        setIsInstallable(false);
    };

    return (
        <InstallContext.Provider value={{ installPrompt, showInstallPrompt, isInstallable }}>
            {children}
        </InstallContext.Provider>
    );
};
