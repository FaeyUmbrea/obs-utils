// SPDX-FileCopyrightText: 2022 Johannes Loher
//
// SPDX-License-Identifier: MIT

export async function preloadTemplates() {
  const templatePaths = ['modules/obs-utils/templates/director.html'];

  return loadTemplates(templatePaths);
}
