---
type: note
title: Entendendo ownership
description: Anotações sobre o sistema de posse do Rust.
mood: curioso
tags: [rust, conceitos]
timestamp: 2026-06-20T21:00:00-03:00
---

# Entendendo ownership

Cada valor tem um único dono. Quando o dono sai de escopo, o valor é liberado.
Borrowing (`&`) empresta sem transferir posse. Ligado à minha meta de
[aprender Rust](../goals/aprender-rust.md).
