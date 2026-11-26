# Ludo Revolution

Projet Android pour emballer le jeu Ludo Revolution existant dans une application installable.

## Version actuelle
Cette première version Android utilise une WebView qui ouvre le jeu hébergé sur Astrocade. Une connexion Internet est nécessaire.

## Règles à préserver
- 2 à 6 joueurs.
- Captures normales et captures en arrière uniquement si elles capturent légalement.
- Les pions doublés sur une case sont protégés.
- Un pion capturé rejoint la base du capturant ; son propriétaire doit obtenir un double six pour le récupérer dans sa propre base, puis un autre six pour le remettre en jeu.
- Un six permet de sortir un pion de sa base initiale.

## Construction
Projet Android Gradle. Ouvrir dans Android Studio et générer un APK debug ou un AAB signé pour publication.