using MediatR;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;
using Raytha.Application.Common.Interfaces;
using Raytha.Application.Common.Models.RenderModels;
using Raytha.Application.Templates.Web;
using Raytha.Application.Templates.Web.Queries;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Raytha.Web.Areas.Public.DbViewEngine;

public class ErrorActionViewResult : IActionResult
{
    private readonly string _view;
    private readonly object _target;
    private readonly int _httpStatusCode;
    private readonly ViewDataDictionary _viewDictionary;

    public ErrorActionViewResult(string view, int httpStatusCode, object target, ViewDataDictionary viewDictionary)
    {
        _view = view;
        _target = target;
        _httpStatusCode = httpStatusCode;
        _viewDictionary = viewDictionary;
    }

    public string ContentType { get; set; } = "text/html";

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var httpContext = context.HttpContext;
        var renderer = httpContext.RequestServices.GetRequiredService<IRenderEngine>();
        var currentOrg = httpContext.RequestServices.GetRequiredService<ICurrentOrganization>();
        var currentUser = httpContext.RequestServices.GetRequiredService<ICurrentUser>();
        var mediator = httpContext.RequestServices.GetRequiredService<IMediator>();
        var antiforgery = httpContext.RequestServices.GetRequiredService<IAntiforgery>();

        httpContext.Response.StatusCode = _httpStatusCode;
        httpContext.Response.ContentType = ContentType;

        var template = await mediator.Send(new GetWebTemplateByName.Query { DeveloperName = _view });
        var source = template.Result.Content;
        var sourceWithParents = WebTemplateExtensions.ContentAssembledFromParents(source, template.Result.ParentTemplate);

        var renderModel = new Wrapper_RenderModel
        {
            CurrentOrganization = CurrentOrganization_RenderModel.GetProjection(currentOrg),
            CurrentUser = CurrentUser_RenderModel.GetProjection(currentUser),
            Target = _target,
            RequestVerificationToken = antiforgery.GetAndStoreTokens(httpContext).RequestToken,
            QueryParams = QueryCollectionToDictionary(httpContext.Request.Query),
            ViewData = _viewDictionary
        };

        await using (var sw = new StreamWriter(httpContext.Response.Body))
        {
            var body = renderer.RenderAsHtml(sourceWithParents, renderModel);
            await sw.WriteAsync(body);
        }
    }

    Dictionary<string, string> QueryCollectionToDictionary(IQueryCollection query)
    {
        var dict = new Dictionary<string, string>();
        foreach (var key in query.Keys)
        {
            StringValues value = string.Empty;
            query.TryGetValue(key, out @value);
            dict.Add(key, @value);
        }
        return dict;
    }
}